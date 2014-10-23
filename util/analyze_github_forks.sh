#! /bin/bash
#
# check the remotes and see if github can help us discover who of them did actually any work on SlickGrid (graph view in github is 
# NIL as there are too many forks; the key here is to discover which forks actually contain any new work at all).
# 
# To protect myself from leaking my credentials into the repo (that would a security goof of the first order!) parameter 1
# of this script should be the user:pass as required by github basic auth / curl.
#

pushd $(dirname $0)                                                                                     2> /dev/null  > /dev/null

cd ..



getopts ":uh" opt
#echo opt+arg = "$opt$OPTARG"
case "$opt$OPTARG" in
"h" )
  cat <<EOT
$0 [-F] [-l]

checkout git submodules to the preconfigured branch (master / other).

-F       : apply 'git reset --hard' and 'git checkout --force' to each submodule

-u       : list the submodules which will be checked out to a non-'master' branch

EOT
  popd                                                                                                    2> /dev/null  > /dev/null
  exit
  ;;

* )
  echo "--- checkout git submodules to master / branch ---"
  ;;
esac


echo "Fetching forks info..."
mkdir -p __forks.info__                                                                                   2> /dev/null  > /dev/null
for f in $( git remote -v | sed -e 's/^.*\(\.com\/\|:\)\([^\/]\+\)\/\([^.]\+\)\.git.*$/https:\/\/api.github.com\/repos\/\2\/\3\/forks?author=\2/' | sort | uniq ) ; do
    echo "For: $f ..."
    forkdir=$( echo $f | sed -e 's/https:\/\/api.github.com\/repos\///' -e 's/\/forks?.*$//' -e 's/[^a-zA-Z0_9_-]/_/g' )
    echo "    dir: $forkdir"
    mkdir -p __forks.info__/$forkdir                                                                      2> /dev/null  > /dev/null
    cd __forks.info__/$forkdir
    if test ! -f __forks__.dump ; then
        curl -u GerHobbelt:Noppes $( echo $f | sed -e 's/\/forks?.*$/\/forks/' )              > __forks__.dump
    fi
    if test ! -f __commits__.dump ; then
        curl -u GerHobbelt:Noppes $( echo $f | sed -e 's/\/forks?/\/commits?/' )              > __commits__.dump
    fi
    cd ../../
done


echo "Collect all the forks listed in there..."
cat $( find ./__forks.info__ -type f -name __forks__.dump ) > __forks__.bulk_dump

echo "Registering all detected clones..."
grep -e '"git_url"' __forks__.bulk_dump | sed -e 's/\"//g' -e 's/^.*\s\+git:\/\/github\.com\/\([^\/]\+\)\/\([^.]\+\)\.git.*$/git remote add \1 git@github.com:\1\/\2.git ;/' | bash


echo "Find out which clones have no personal work, i.e. are fruitless, and remove them..."
for f in $( git remote -v | sed -e 's/^.*\(\.com\/\|:\)\([^\/]\+\)\/\([^.]\+\)\.git.*$/https:\/\/api.github.com\/repos\/\2\/\3\/forks?author=\2/' | sort | uniq ) ; do
    #echo "For: $f ..."
    reponame=$( echo $f | sed -e 's/https:\/\/api.github.com\/repos\///' -e 's/\/[^\/]\+\/forks?.*$//' )
    #echo "    reponame: $reponame"
    forkdir=$( echo $f | sed -e 's/https:\/\/api.github.com\/repos\///' -e 's/\/forks?.*$//' -e 's/[^a-zA-Z0_9_-]/_/g' )
    #echo "    dir: $forkdir"
    mkdir -p __forks.info__/$forkdir                                                                      2> /dev/null  > /dev/null
    cd __forks.info__/$forkdir
    if test -f __commits__.dump ; then
        if test $( grep -e '"message": "Not Found"' __commits__.dump | wc -l ) -gt 0 ; then
            echo "Repo is not present any more: $reponame      $forkdir"
            git remote rm $reponame
        elif test $( grep -e '"sha":' __commits__.dump | wc -l ) -eq 0 ; then  
            echo "Repo does not contain any new work: $reponame      $forkdir"
            git remote rm $reponame
        fi
    fi
    cd ../../
done



popd                                                                                                    2> /dev/null  > /dev/null

